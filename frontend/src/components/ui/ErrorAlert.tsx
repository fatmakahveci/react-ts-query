import type { JSX } from "react";
const ErrorAlert = ({ title, message }: { title: string; message: string }): JSX.Element => {
  return (
    <div className="error-block" role="alert">
      <div className="error-block-icon">!</div>
      <div className="error-block-text">
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default ErrorAlert;
