import { FileX } from "lucide-react";
export default function EmptyState({title="Nothing here",description="No data available."}){
return(<div className="flex flex-col items-center py-10 text-center">
<FileX className="h-12 w-12 text-muted-foreground"/>
<h3 className="mt-3 font-semibold">{title}</h3>
<p className="text-sm text-muted-foreground">{description}</p>
</div>);}