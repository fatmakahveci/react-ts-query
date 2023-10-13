"use client";

const ErrorBlock = (title: string, message: string): JSX.Element => {
	return (
		<div className="error-block">
			<div className="error-block-icon">!</div>
			<div className="error-block-text">
				<h2>{title}</h2>
				<p>{message}</p>
			</div>
		</div>
	);
};

export default ErrorBlock;
