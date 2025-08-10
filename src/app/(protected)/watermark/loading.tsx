import { Loader2 } from "lucide-react";

const Loading = () => {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/70">Loading watermark tool...</p>
        </div>
      </div>
    </div>
  );
};

export default Loading;
