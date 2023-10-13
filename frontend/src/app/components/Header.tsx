"use client";

import { ReactNode } from "react";

const Header = ({ children }: { children: ReactNode }): JSX.Element => {
	return (
		<>
			<div id="main-header-loading"></div>
			<header id="main-header">
				<div id="header-title">
					<h1>React Events</h1>
				</div>
				<nav>{children}</nav>
			</header>
		</>
	);
};

export default Header;
