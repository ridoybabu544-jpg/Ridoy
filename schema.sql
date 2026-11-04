CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE,salt TEXT,hash TEXT,points INTEGER DEFAULT 0,created INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER,role TEXT,created INTEGER);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,seconds INTEGER,points INTEGER,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS starts(user_id INTEGER,task_id INTEGER,started INTEGER,PRIMARY KEY(user_id,task_id));
CREATE TABLE IF NOT EXISTS done(user_id INTEGER,task_id INTEGER,PRIMARY KEY(user_id,task_id));
CREATE TABLE IF NOT EXISTS withdraws(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,method TEXT,number TEXT,points INTEGER,status TEXT DEFAULT 'pending',created INTEGER);
INSERT INTO tasks(title,seconds,points) VALUES('নিউজ পেজ দেখুন',10,5),('ব্লগ আর্টিকেল পড়ুন',15,8),('প্রোডাক্ট পেজ ভিজিট',20,12);
