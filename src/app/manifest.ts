import type { MetadataRoute } from "next";

/** App instalável: no iOS, notificações web exigem adicionar à tela inicial. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:"VITRAL · Gestão Inteligente",
    short_name:"VITRAL",
    description:"Demandas e gestão de processos da Sacra",
    start_url:"/demandas",
    scope:"/",
    display:"standalone",
    background_color:"#f8f7f4",
    theme_color:"#731515",
    icons:[
      {src:"/icon.png",sizes:"any",type:"image/png",purpose:"any"},
    ],
  };
}
