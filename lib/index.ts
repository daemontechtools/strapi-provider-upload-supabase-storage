import { createClient } from "@supabase/supabase-js";
import { Stream } from "stream";


export type SupabaseStorageProviderOptions = {
    apiUrl: string,
    apiKey: string,
    bucket: string,
    directory?: string,
    options?: Object
}

export type StrapiFile = {
    name: string
    hash: string
    ext: string
    mime: string
    path: object
    width: number
    height: number
    size: number
    url: string
    buffer?: string
    stream?: Stream
    getStream: () => {}
}

async function streamToBuffer(stream: Stream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const buffer: Buffer[] = [];
        stream.on('data', (chunk) => buffer.push(chunk));
        stream.on('end', () => {
            resolve(Buffer.concat(buffer));
        });
        stream.on('error', reject);
    });
}


module.exports = {
    init({
        apiUrl,
        apiKey,
        bucket = "strapi-uploads",
        directory = "",

    }: SupabaseStorageProviderOptions) {
        const supabase = createClient(apiUrl, apiKey);

        // Remove any leading and trailing slashes
        directory = directory.replace(/(^\/)|(\/$)/g, "");

        const upload = async (file: StrapiFile, customParams = {}) => {
            const path = (file.path) ? file.path : '';
            const uploadPath = `${directory}/${path}${file.hash}${file.ext}`;
            const uploadData = (file.stream) 
                ? await streamToBuffer(file.stream)
                : Buffer.from(file.buffer!, 'binary');

            const { error } = await supabase
                .storage
                .from(bucket)
                .upload(
                    uploadPath, 
                    uploadData, 
                    {
                        cacheControl: "3600",
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