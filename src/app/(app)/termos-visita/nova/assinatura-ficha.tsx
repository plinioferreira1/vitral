"use client";
import { useState } from "react";
import { CanvasAssinatura } from "@/components/canvas-assinatura";
export function AssinaturaFicha() {
 const [assinatura,setAssinatura]=useState<string|null>(null);
 return <div className="space-y-2 border-t border-border pt-4">
 <p className="text-sm font-semibold text-brand">Assinatura do cliente</p>
 <CanvasAssinatura onChange={setAssinatura}/>
 <input type="hidden" name="assinatura_imagem" value={assinatura??""}/>
 <p className="text-xs text-ink-muted">Assine diretamente nesta ficha antes de salvar.</p>
 </div>;
}
