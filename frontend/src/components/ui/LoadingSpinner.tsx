import type { JSX } from "react";
const LoadingSpinner = (): JSX.Element => {
  return (
    <div className="lds-ring" role="status" aria-label="Loading">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};

export default LoadingSpinner;
