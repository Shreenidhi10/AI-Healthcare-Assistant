import { Camera, FileUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickUpload() {

  const navigate = useNavigate();

  return (

    <section className="rounded-3xl bg-card p-5 shadow-card">

      <h2 className="font-display text-2xl">
        Upload Prescription
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Scan using your camera or upload an image/PDF.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">

        <button
          onClick={() => navigate("/upload")}
          className="flex flex-col items-center rounded-2xl bg-primary py-5 text-white transition hover:scale-105"
        >
          <Camera size={28} />

          <span className="mt-3">
            Camera
          </span>

        </button>

        <button
          onClick={() => navigate("/upload")}
          className="flex flex-col items-center rounded-2xl border py-5 transition hover:border-primary hover:text-primary"
        >

          <FileUp size={28} />

          <span className="mt-3">
            Upload PDF
          </span>

        </button>

      </div>

    </section>

  );
}