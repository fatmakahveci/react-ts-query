"use client";

// import { useRef } from "react";

const FindEventSection = (): JSX.Element => {
	// const searchElement = useRef();
	
	const handleSubmit = (event: any) => {
		event.preventDefault();
	};

	return (
		<section className="content-section" id="all-events-section">
			<header>
				<h2>Find your next event!</h2>
				<form onSubmit={handleSubmit} id="search-form">
					
					<button>Search</button>
				</form>
			</header>
			<p>Please enter a search term and to find events.</p>
		</section>
	);
};

export default FindEventSection;
