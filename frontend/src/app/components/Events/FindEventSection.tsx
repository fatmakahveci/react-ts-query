"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { fetchEvents } from "../../util/http";

const FindEventSection = (): JSX.Element => {
	const searchElement = useRef<HTMLInputElement>();
	const [searchValue, setSearchValue] = useState('');

	useQuery({
		queryKey: ["events", { search: searchElement.current.value }],
		queryFn: () => fetchEvents(searchElement.current.value),
	});
	
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
