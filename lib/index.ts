import { createClient } from "@supabase/supabase-js";
import { Stream } from "stream";
//import path from "path"; 
//import { readFile } from "fs/promises";


function sanitizeDirectory(directory: string) {
    const currentDate = new Date();
    const year = currentDate.getFullYear().toString();
    let month = (currentDate.getMonth() + 1).toString();
    if(month.length === 1) {
        month = "0" + month;
    }

    return (directory)
        ? directory.replace(/(^\/)|(\/$)/g, "")
        : `${year}/${month}`
}

export type SupabaseStorageProviderOptions = {
    apiUrl: string,
    apiKey: string,
    bucket: string,
    directory?: string,
    options?: Object
}

export default {

    init({
        apiUrl,
        apiKey,
        bucket = "strapi-uploads",
        directory = "",

    }: SupabaseStorageProviderOptions) {

        const supabase = createClient(apiUrl, apiKey);
        directory = sanitizeDirectory(directory);

        const upload = async (file: any, customParams = {}) => {
            file.hash = new Date().getTime();
            const path = (file.path) ? file.path : '';
            const uploadPath = `${directory}/${path}${file.hash}${file.ext}`;
            const uploadData = file.stream || Buffer.from(file.buffer, 'binary');
            const { error } = await supabase
                .storage
                .from(bucket)
                .upload(
                    uploadPath, 
                    uploadData, 
                    {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.mime
                    }
                );
            if(error) throw error;
            
            const { data: { publicUrl } } = supabase
                .storage
                .from(bucket)
                .getPublicUrl(uploadPath);
            file.url = publicUrl;
        };
        
        return {
            upload,
            uploadStream: upload,
            delete: async (file: any, customParams = {}) => {
                const path = (file.path) ? file.path : '';
                const uploadPath = `${directory}/${path}${file.hash}${file.ext}`;
                const { error } = await supabase
                    .storage
                    .from(bucket)
                    .remove([uploadPath]);
                if(error) throw error;
            }
        };
    },
};






// const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICAgInJvbGUiOiAic2VydmljZV9yb2xlIiwKICAgICJpc3MiOiAic3VwYWJhc2UiLAogICAgImlhdCI6IDE2NzYzNTA4MDAsCiAgICAiZXhwIjogMTgzNDExNzIwMAp9.3Ss_ANUkd1vznrNWctlWGXKuWtEy8Jf6Bj9U45uWfy4";
// const API_URL = "http://localhost:8000";


// const supabase = createClient(API_URL, API_KEY);

// const currentDate = new Date();
// const year = currentDate.getFullYear();
// const month = currentDate.getMonth() + 1;

// const bucket = "strapi-uploads";
// const directory = `${year}/${month}`;
// console.log("directory name: ", directory);


// const upload2 = async (imagePath: string) => {
//     const imageName = path.basename(imagePath);
//     const imageData = await readFile(imagePath);
//     const uploadPath = path.join(directory, imageName);
//     const { data, error } = await supabase
//         .storage
//         .from(bucket)
//         .upload(uploadPath, imageData, {
//             cacheControl: '3600',
//             upsert: false
//         });
//     if(error) {
//         console.log(error.message);
//         throw new Error("Error uploading to Supabase!");
//     }

//     console.log("Successfully Uploaded Image!");
//     console.log(data);
// }

// function getFilePath(directory: string, file: any) {
//     console.log("file", file);
//     const path = (file.path) ? file.path : '';
//     const fileName = file.name.replace(/\.[^/.]+$/, "");
//     const uniqueFileName = `${path}${file.hash}${file.ext}`;
//     return `${directory}/${uniqueFileName}`.replace(/^\//g, "");
// }


// const imagePath = path.join(__dirname, "test.jpg");
// console.log("image path", imagePath);
// upload(imagePath);