"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchEvents } from "../../util/http";

const FindEventSection = (): JSX.Element => {
	const [searchValue, setSearchValue] = useState("");

	useQuery({
		queryKey: ["events", { search: searchValue }],
		queryFn: () => fetchEvents(searchValue),
	});
	
	const handleSubmit = (event: any) => {
		event.preventDefault();
	};

	return (
		<section className="content-section" id="all-events-section">
			<header>
				<h2>Find your next event!</h2>
				<form onSubmit={handleSubmit} id="search-form">
					<input
						type="search"
						value={searchValue}
						onChange={(event) => setSearchValue(event.target.value)}
						aria-label="Search events"
					/>
					<button>Search</button>
				</form>
			</header>
			<p>Please enter a search term and to find events.</p>
		</section>
	);
};

export default FindEventSection;
