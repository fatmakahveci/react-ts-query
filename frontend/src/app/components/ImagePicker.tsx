"use client";

const ImagePicker = ({
	images,
	selectedImage,
	onSelect,
}: {
	images: any;
	selectedImage: any;
	onSelect: any;
}): JSX.Element => {
	return (
		<div id="image-picker">
			<p>Select an image</p>
			<ul>
				{images.map((image: any) => (
					<li
						key={image.path}
						onClick={() => onSelect(image.path)}
						className={
							selectedImage === image.path
								? "selected"
								: undefined
						}
					>
						<img
							src={`http://localhost:3000/${image.path}`}
							alt={image.caption}
						/>
					</li>
				))}
			</ul>
		</div>
	);
};

export default ImagePicker;
