# টাস্ক অ্যাপ: Cloudflare সেটআপ (ধাপে ধাপে)

ইউজার পেজ: `/` · অ্যাডমিন পেজ: `/admin.html`

1. **GitHub:** এই ফোল্ডারের সব ফাইল নতুন একটা repo-তে আপলোড করুন।
2. **D1 ডেটাবেস:** Cloudflare Dashboard → Storage & Databases → D1 → Create database (নাম: `taskapp`)।
   তারপর Console ট্যাবে `schema.sql` এর পুরো লেখা পেস্ট করে Execute করুন।
3. **Pages প্রজেক্ট:** Workers & Pages → Create → Pages → Connect to Git → আপনার repo বেছে নিন।
   Build command ফাঁকা রাখুন, Build output directory: `public`।
4. **ডেটাবেস জোড়া:** প্রজেক্টের Settings → Bindings → Add → D1 database।
   Variable name: `DB`, ডেটাবেস: `taskapp`।
5. **অ্যাডমিন পাসওয়ার্ড:** Settings → Variables and Secrets → Add → Type: Secret।
   নাম: `ADMIN_PASSWORD`, মান: আপনার শক্ত পাসওয়ার্ড (বড় অক্ষর, ছোট অক্ষর, সংখ্যা মিলিয়ে)।
6. **Deployments** থেকে Retry deployment দিন, তারপর সাইট খুলুন।

## জেনে রাখুন
- টাস্কের সময় সার্ভারেও চেক হয়, তাই টাইমার স্কিপ করে পয়েন্ট নেওয়া যায় না।
- প্রতিটা টাস্ক একজন ইউজার একবারই করতে পারে।
- উইথড্র অ্যাপ্রুভ করলে আসল টাকা আপনাকে নিজে হাতে পাঠাতে হবে। অ্যাপ নিজে টাকা পাঠায় না।
- লগইনে ব্রুট-ফোর্স ঠেকানোর ব্যবস্থা নেই। Cloudflare-এর Rate limiting rule যোগ করা ভালো।
- `wrangler.toml` শুধু CLI দিয়ে ডিপ্লয় করলে লাগে। ড্যাশবোর্ড দিয়ে করলে দরকার নেই।
