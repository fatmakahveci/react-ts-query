"use client";

const LoadingIndicator = (): JSX.Element => {
	return (
		<div className="lds-ring">
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</div>
	);
};

export default LoadingIndicator;
