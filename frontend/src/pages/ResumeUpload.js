import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { uploadResume } from '../services/api';
import { useAuth } from '../context/AuthContext';

GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

function ResumeUpload() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const extractPdfText = async (pdfFile) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += `${pageText}\n`;
    }

    return fullText.trim();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    setError('');
    setStatus('');

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isPdf =
      selectedFile.type === 'application/pdf' ||
      selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setError('Only PDF files are allowed.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a PDF resume first.');
      return;
    }

    setUploading(true);
    setError('');
    setStatus('Reading PDF...');

    try {
      const rawText = await extractPdfText(file);

      if (!rawText) {
        throw new Error('Could not extract text from this PDF.');
      }

      setStatus('Uploading resume...');
      const result = await uploadResume(token, file.name, rawText);

      if (result.error) {
        throw new Error(result.error);
      }

      setStatus('Resume uploaded successfully.');
    } catch (err) {
      setError(err.message || 'Upload failed.');
      setStatus('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="resume-upload-container">
      <div className="resume-upload-card">
        <h1>Upload Resume</h1>
        <p className="resume-upload-subtitle">
          Upload your resume as a PDF so we can store and analyze its content
          later.
        </p>

        {error && <div className="error-message">{error}</div>}
        {status && <div className="success-message">{status}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="resumeFile">Resume PDF</label>
            <input
              id="resumeFile"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              required
            />
          </div>

          {file && (
            <p className="file-meta">
              Selected: <strong>{file.name}</strong>
            </p>
          )}

          <div className="resume-upload-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResumeUpload;
