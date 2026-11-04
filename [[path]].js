const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json"}});
const E=(m,s=400)=>J({error:m},s);
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const rnd=()=>hex(crypto.getRandomValues(new Uint8Array(24)));
async function hash(pw,salt){
  const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new TextEncoder().encode(salt),iterations:100000},k,256));
}
export async function onRequest({request,env,params}){
  const db=env.DB,p=[].concat(params.path||[]).join("/"),m=request.method,now=Date.now();
  let b={};
  if(m!=="GET"){try{b=await request.json()}catch{}}
  const tok=(request.headers.get("authorization")||"").slice(7);
  const ses=tok?await db.prepare("SELECT * FROM sessions WHERE token=?").bind(tok).first():null;
  const uid=ses&&ses.role==="user"?ses.user_id:null,isAdmin=!!ses&&ses.role==="admin";

  if(p==="register"&&m==="POST"){
    const u=String(b.username||"").toLowerCase(),pw=String(b.password||"");
    if(!/^[a-z0-9_]{3,20}$/.test(u))return E("ইউজারনেম ৩-২০ অক্ষর (a-z, 0-9, _)");
    if(pw.length<6)return E("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");
    const salt=rnd(),r=await db.prepare("INSERT OR IGNORE INTO users(username,salt,hash,created) VALUES(?,?,?,?)").bind(u,salt,await hash(pw,salt),now).run();
    if(!r.meta.changes)return E("এই ইউজারনেম আগে নেওয়া হয়েছে");
    const id=r.meta.last_row_id,t=rnd();
    await db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").bind(t,id,"user",now).run();
    return J({token:t});
  }
  if(p==="login"&&m==="POST"){
    const u=await db.prepare("SELECT * FROM users WHERE username=?").bind(String(b.username||"").toLowerCase()).first();
    if(!u||u.hash!==await hash(String(b.password||""),u.salt))return E("ইউজারনেম বা পাসওয়ার্ড ভুল",401);
    const t=rnd();
    await db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").bind(t,u.id,"user",now).run();
    return J({token:t});
  }
  if(p==="admin/login"&&m==="POST"){
    if(!env.ADMIN_PASSWORD||String(b.password||"")!==env.ADMIN_PASSWORD)return E("পাসওয়ার্ড ভুল",401);
    const t=rnd();
    await db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").bind(t,0,"admin",now).run();
    return J({token:t});
  }

  if(p.startsWith("admin/")){
    if(!isAdmin)return E("অনুমতি নেই",401);
    if(p==="admin/task"&&m==="POST"){
      const t=String(b.title||"").trim().slice(0,80),s=+b.seconds,pt=+b.points;
      if(!t||!(s>=5)||!(pt>=1))return E("নাম, ন্যূনতম ৫ সেকেন্ড ও ১ পয়েন্ট দিন");
      await db.prepare("INSERT INTO tasks(title,seconds,points) VALUES(?,?,?)").bind(t,Math.floor(s),Math.floor(pt)).run();
      return J({ok:1});
    }
    if(p.startsWith("admin/task/")&&m==="DELETE"){
      await db.prepare("UPDATE tasks SET active=0 WHERE id=?").bind(+p.split("/")[2]).run();
      return J({ok:1});
    }
    if(p==="admin/withdraws")return J({rows:(await db.prepare("SELECT w.*,u.username FROM withdraws w JOIN users u ON u.id=w.user_id ORDER BY w.id DESC LIMIT 100").all()).results});
    if(p.startsWith("admin/withdraw/")&&m==="POST"){
      const id=+p.split("/")[2],w=await db.prepare("SELECT * FROM withdraws WHERE id=? AND status='pending'").bind(id).first();
      if(!w)return E("রিকোয়েস্ট পাওয়া যায়নি বা আগেই সম্পন্ন");
      if(b.action==="approve")await db.prepare("UPDATE withdraws SET status='approved' WHERE id=?").bind(id).run();
      else await db.batch([db.prepare("UPDATE withdraws SET status='rejected' WHERE id=?").bind(id),db.prepare("UPDATE users SET points=points+? WHERE id=?").bind(w.points,w.user_id)]);
      return J({ok:1});
    }
    if(p==="admin/users")return J({rows:(await db.prepare("SELECT id,username,points,created FROM users ORDER BY id DESC LIMIT 200").all()).results});
    return E("পাওয়া যায়নি",404);
  }

  if(p==="tasks"&&m==="GET"){
    const r=await db.prepare("SELECT t.id,t.title,t.seconds,t.points,(SELECT 1 FROM done d WHERE d.task_id=t.id AND d.user_id=?) AS done FROM tasks t WHERE t.active=1 ORDER BY t.id").bind(uid||0).all();
    return J({rows:r.results});
  }
  if(!uid)return E("আগে লগইন করুন",401);
  if(p==="me"){
    const u=await db.prepare("SELECT username,points FROM users WHERE id=?").bind(uid).first();
    return J(u||{});
  }
  if(p==="tasks/start"&&m==="POST"){
    const t=await db.prepare("SELECT * FROM tasks WHERE id=? AND active=1").bind(+b.id).first();
    if(!t)return E("টাস্ক নেই");
    if(await db.prepare("SELECT 1 FROM done WHERE user_id=? AND task_id=?").bind(uid,t.id).first())return E("এই টাস্ক আগেই শেষ করেছেন");
    await db.prepare("INSERT OR REPLACE INTO starts VALUES(?,?,?)").bind(uid,t.id,now).run();
    return J({ok:1});
  }
  if(p==="tasks/finish"&&m==="POST"){
    const t=await db.prepare("SELECT * FROM tasks WHERE id=?").bind(+b.id).first();
    const s=t&&await db.prepare("SELECT * FROM starts WHERE user_id=? AND task_id=?").bind(uid,t.id).first();
    if(!s)return E("টাস্ক শুরু করা হয়নি");
    if(now-s.started<t.seconds*1000-1500)return E("সময় এখনো শেষ হয়নি");
    const r=await db.prepare("INSERT OR IGNORE INTO done VALUES(?,?)").bind(uid,t.id).run();
    if(!r.meta.changes)return E("আগেই পয়েন্ট পেয়েছেন");
    await db.batch([db.prepare("UPDATE users SET points=points+? WHERE id=?").bind(t.points,uid),db.prepare("DELETE FROM starts WHERE user_id=? AND task_id=?").bind(uid,t.id)]);
    return J({added:t.points});
  }
  if(p==="withdraw"&&m==="POST"){
    const n=Math.floor(+b.points),num=String(b.number||""),me=String(b.method||"");
    if(!["বিকাশ","নগদ","রকেট"].includes(me))return E("মাধ্যম বেছে নিন");
    if(!/^01\d{9}$/.test(num))return E("সঠিক ১১ ডিজিটের নম্বর দিন");
    if(!(n>=100))return E("ন্যূনতম ১০০ পয়েন্ট লাগবে");
    const r=await db.prepare("UPDATE users SET points=points-?1 WHERE id=?2 AND points>=?1").bind(n,uid).run();
    if(!r.meta.changes)return E("পর্যাপ্ত পয়েন্ট নেই");
    await db.prepare("INSERT INTO withdraws(user_id,method,number,points,created) VALUES(?,?,?,?,?)").bind(uid,me,num,n,now).run();
    return J({ok:1});
  }
  if(p==="withdraws")return J({rows:(await db.prepare("SELECT method,number,points,status,created FROM withdraws WHERE user_id=? ORDER BY id DESC LIMIT 50").bind(uid).all()).results});
  return E("পাওয়া যায়নি",404);
}
