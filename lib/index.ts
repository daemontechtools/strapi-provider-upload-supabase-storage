import { createClient } from "@supabase/supabase-js";
import path from "path"; 
import { readFile } from "fs/promises";

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICAgInJvbGUiOiAic2VydmljZV9yb2xlIiwKICAgICJpc3MiOiAic3VwYWJhc2UiLAogICAgImlhdCI6IDE2NzYzNTA4MDAsCiAgICAiZXhwIjogMTgzNDExNzIwMAp9.3Ss_ANUkd1vznrNWctlWGXKuWtEy8Jf6Bj9U45uWfy4";
const API_URL = "http://localhost:8000";


const supabase = createClient(API_URL, API_KEY);

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = currentDate.getMonth() + 1;

const bucket = "strapi-uploads";
const directory = `${year}/${month}`;
console.log("directory name: ", directory);


const upload = async (imagePath: string) => {
    const imageName = path.basename(imagePath);
    const imageData = await readFile(imagePath);
    const uploadPath = path.join(directory, imageName);
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(uploadPath, imageData, {
            cacheControl: '3600',
            upsert: false
        });
    if(error) {
        console.log(error.message);
        throw new Error("Error uploading to Supabase!");
    }

    console.log("Successfully Uploaded Image!");
    console.log(data);
}


const imagePath = path.join(__dirname, "test.jpg");
console.log("image path", imagePath);
upload(imagePath);
