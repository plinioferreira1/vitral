/* Somente notificações de demandas. Nenhum cache offline ou dado de clientes. */
self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?.json()||{}}catch{}
  const url=typeof data.url==="string"&&/^\/demandas\/[0-9a-f-]{36}$/i.test(data.url)
    ?data.url:"/demandas";
  const title=typeof data.title==="string"?data.title:"VITRAL · Nova demanda";
  event.waitUntil(self.registration.showNotification(title,{
    body:"Há uma atualização na sua Central de Demandas.",
    icon:"/favicon.ico",
    tag:"demandas-"+url,renotify:true,
    data:{url},
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification.data?.url||"/demandas";
  event.waitUntil((async()=>{
    const tabs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const dest=new URL(url,self.location.origin).href;
    for(const tab of tabs){
      if(tab.url.startsWith(self.location.origin)){
        await tab.focus();
        if("navigate" in tab)await tab.navigate(dest);
        return;
      }
    }
    await self.clients.openWindow(dest);
  })());
});
