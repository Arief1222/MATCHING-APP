// frontend/src/pages/UploadPage.jsx
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import UploadFile from "../components/UploadFile";
import TablesPage from "./TablesPage";

const UploadPage = ({
  getAuthHeaders,
  getAuthHeadersMultipart,
  setLoading,
}) => {
  const [file, setFile] = useState(null);
  const [tableName, setTableName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.warn("Pilih file terlebih dahulu");
    if (!tableName) return toast.warn("Isi nama tabel terlebih dahulu");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("table_name", tableName);

    setIsUploading(true);
    try {
      const headers = await getAuthHeadersMultipart();
      const res = await axios.post("http://127.0.0.1:8001/upload/", formData, {
        headers,
      });

      toast.success(`File berhasil diupload ke tabel ${tableName}!`);

      // Reset form setelah berhasil upload
      setFile(null);
      setTableName("");
    } catch (err) {
      toast.error("Gagal upload file");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="space-y-6">
      {user.role === "superadmin" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <UploadFile
            file={file}
            setFile={setFile}
            tableName={tableName}
            setTableName={setTableName}
            handleUpload={handleUpload}
            isUploading={isUploading}
          />
        </div>
      )}
      <TablesPage />
    </div>
  );
};

export default UploadPage;
