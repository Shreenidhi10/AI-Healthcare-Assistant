import {
  ChevronRight,
  FileText,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

export default function RecentPrescriptionCard({
  prescription,
}) {

  const navigate = useNavigate();

  return (

    <button
      onClick={() =>
        navigate(`/prescription/${prescription.id}`)
      }
      className="w-full rounded-2xl bg-card p-4 text-left shadow-card transition hover:shadow-lg"
    >

      <div className="flex justify-between">

        <div className="flex gap-3">

          <div className="rounded-xl bg-primary/10 p-3">

            <FileText
              className="text-primary"
              size={22}
            />

          </div>

          <div>

            <h3 className="font-semibold">

              {prescription.title}

            </h3>

            <p className="mt-1 text-sm text-muted-foreground">

              {prescription.language}

              {" • "}

              {prescription.status}

            </p>

            <p className="mt-1 text-xs text-muted-foreground">

              {prescription.date}

            </p>

          </div>

        </div>

        <ChevronRight
          className="text-muted-foreground"
        />

      </div>

    </button>

  );
}