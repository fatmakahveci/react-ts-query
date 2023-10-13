"use client";

import { Link, useNavigate } from "react-router-dom";

import Modal from "../UI/Modal";
import EventForm from "./EventForm";

const EditEvent = (): JSX.Element => {
	const navigate = useNavigate();

	const handleSubmit = (formData: FormData): void => {};

	const handleClose = (): void => {
		navigate("../");
	}

	return (
		<Modal onClose={handleClose}>
			<EventForm inputData={null} onSubmit={handleSubmit}>
				<Link to="../" className="button-text">
					Cancel
				</Link>
				<button type="submit" className="button">
					Update
				</button>
			</EventForm>
		</Modal>
	);
};

export default EditEvent;
