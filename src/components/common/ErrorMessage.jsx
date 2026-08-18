import { AlertTriangle } from "lucide-react";
export default function ErrorMessage({message="Something went wrong."}){
return(<div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex gap-2">
<AlertTriangle className="text-destructive"/>
<p>{message}</p></div>);}