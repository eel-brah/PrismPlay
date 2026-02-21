import { useNavigate } from "react-router-dom";

interface NotFoundProps {
  code?: number;
  title?: string;
  message?: string;
}

export default function ErrorPage({ code, title, message }: NotFoundProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {code && (
          <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 select-none">
            {code}
          </h1>
        )}

        <h2 className="mt-4 text-2xl font-semibold text-white">
          {title || "Something went wrong"}
        </h2>

        <p className="mt-3 text-gray-400 text-sm leading-relaxed">
          {message ||
            "The page you're looking for doesn't exist or has been moved."}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="
              px-6 py-3 rounded-xl font-semibold
              border border-white/10
              bg-white/[0.03]
              hover:bg-white/[0.08]
              text-gray-300 hover:text-white
              transition-all duration-200
            "
          >
            Go Back
          </button>

          <button
            onClick={() => navigate("/home")}
            className="
              px-6 py-3 rounded-xl font-semibold
              bg-gradient-to-r from-purple-500 to-blue-500
              hover:from-purple-400 hover:to-blue-400
              text-white
              shadow-lg
              transition-all duration-200
              hover:scale-[1.03]
            "
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
