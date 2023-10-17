/**
 * @api {post} /create Create
 */

// Path: functions/create.js

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function generateRandomString(length) {
  const characters = '23456789abcdefghjkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}
export async function onRequestPost(context) {
  const { request, env } = context;
  const originurl = new URL(request.url);
  const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("clientIP");
  const userAgent = request.headers.get("user-agent");
  const origin = `${originurl.protocol}//${originurl.hostname}`

  const options = {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  const timedata = new Date();
  const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(timedata);
  const { url, slug } = await request.json();

  if (!url) return Response.json({ message: 'Url不能为空!', code: 400 }, { headers: corsHeaders, status: 400 })

  // url格式检查
  if (!/^https?:\/\/.{3,}/.test(url)) {
    return Response.json({ message: 'Url格式错误!', code: 400 }, { headers: corsHeaders, status: 400 })
  }

  // 自定义slug长度检查 2<slug<10 是否不以文件后缀结尾
  if (slug && (slug.length < 1 || slug.length > 10 || /.+\.[a-zA-Z]+$/.test(slug))) {
    return Response.json({ message: '别名格式不正确！', code: 400 }, { headers: corsHeaders, status: 400 })
  }




  try {

    // 生成随机slug
    const slug2 = slug ? slug : generateRandomString(4);
    // 如果自定义slug
    if (slug) {
      const existUrl = await env.DB.prepare(`SELECT url as existUrl FROM links where slug = '${slug}'`).first()

      // url & slug 是一样的。
      if (existUrl && existUrl.existUrl === url) {
        return Response.json({ slug, link: `${origin}/${slug2}` }, { headers: corsHeaders, status: 200 })
      }

      // slug 已存在
      if (existUrl) {
        return Response.json({ message: '别名已存在！', code: 400 }, { headers: corsHeaders, status: 400 })
      }
    }

    // 目标 url 已存在
    const existSlug = await env.DB.prepare(`SELECT slug as existSlug FROM links where url = '${url}'`).first()

    // url 存在且没有自定义 slug
    if (existSlug && !slug) {
      return Response.json({ slug: existSlug.existSlug, link: `${origin}/${existSlug.existSlug}`, code: 200 }, { headers: corsHeaders, status: 200 })
    }
    const bodyUrl = new URL(url);

    if (bodyUrl.hostname === originurl.hostname) {
      return Response.json({ message: '不能设置相同域名！', code: 400 }, { headers: corsHeaders, status: 400 })
    }

    const info = await env.DB.prepare(`INSERT INTO links (url, slug, ip, status, ua, create_time) 
        VALUES ('${url}', '${slug2}', '${clientIP}',1, '${userAgent}', '${formattedDate}')`).run()

    return Response.json({ slug: slug2, link: `${origin}/${slug2}`, code: 200 }, { headers: corsHeaders, status: 200 })
  } catch (e) {
    // console.log(e);
    return Response.json({ message: e.message, code: 500 }, { headers: corsHeaders, status: 500 })
  }

}

// 处理preflight请求
export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders, status: 201 })
}



