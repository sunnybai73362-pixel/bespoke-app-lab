import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-3xl font-bold">Welcome 🚀</h1>
      <p className="text-gray-600">This is your app’s home page.</p>

      {/* Button to go to Chat */}
      <Link
        to="/chat"
        className="px-6 py-3 text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition"
      >
        Go to Chat 💬
      </Link>
    </div>
  );
};

export default Index;
