import proxy from "express-http-proxy";

export const proxyWithUser =
(serviceUrl)=>{

 return proxy(
  serviceUrl,
  {
   parseReqBody: false,
   proxyReqOptDecorator:
   (proxyReqOpts, srcReq)=>{

    if(srcReq.user){

      proxyReqOpts.headers[
       "x-user-id"
      ] =
      srcReq.user.userId;

      proxyReqOpts.headers[
       "x-user-email"
      ] =
      srcReq.user.email;
      proxyReqOpts.headers[
       "x-user-avatar"
      ] =
      srcReq.user.avatar

    }
    
    if (srcReq.headers["x-github-token"]) {
      proxyReqOpts.headers["x-github-token"] = srcReq.headers["x-github-token"];
    }

    return proxyReqOpts;

   }

  }
 );

}