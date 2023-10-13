"use client";

import { ReactNode } from "react";

export type EventType = {
	date: string;
	description: string;
	id: string;
	image: string;
	title: string;
};

export type PageContentProps = {
	title: string;
	children: ReactNode;
};
