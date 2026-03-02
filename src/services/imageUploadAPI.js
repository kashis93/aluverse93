import { storage } from "./firebase";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";

export const uploadPostImage = (file, setPostImage, setProgress) => {
    const postPicsRef = ref(storage, `alumni_postImages/${file.name}`);
    const uploadTask = uploadBytesResumable(postPicsRef, file);

    uploadTask.on(
        "state_changed",
        (snapshot) => {
            const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setProgress(progress);
        },
        (error) => {
            console.error(error);
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((response) => {
                setPostImage(response);
            });
        }
    );
};
