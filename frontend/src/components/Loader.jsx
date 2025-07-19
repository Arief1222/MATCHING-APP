// components/Loader.jsx
import { ClipLoader } from "react-spinners";

const Loader = ({ loading, size = 18, color = "#000000" }) => {
  return <ClipLoader loading={loading} size={size} color={color} />;
};

export default Loader;