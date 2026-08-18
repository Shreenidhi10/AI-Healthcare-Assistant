function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2 text-primary mb-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span>Extracting text...</span>
    </div>
  );
}

export default Spinner;