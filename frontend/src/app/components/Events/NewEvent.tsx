"use client";

import { Link, NavigateFunction, useNavigate } from "react-router-dom";

import Modal from "../UI/Modal";
import EventForm from "./EventForm";

const NewEvent = (): JSX.Element => {
	const navigate: NavigateFunction = useNavigate();

	const handleSubmit = (formData: FormData): void => {};

	return (
		<Modal onClose={() => navigate("../")}>
			<EventForm onSubmit={handleSubmit}>
				<>
					<Link to="../" className="button-text">
						Cancel
					</Link>
					<button type="submit" className="button">
						Create
					</button>
				</>
			</EventForm>
		</Modal>
	);
};

export default NewEvent;
