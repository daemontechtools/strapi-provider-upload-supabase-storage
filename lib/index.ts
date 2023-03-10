import { createClient } from "@supabase/supabase-js";
import { Stream } from "stream";


export type SupabaseStorageProviderOptions = {
    apiUrl: string,
    apiKey: string,
    bucket: string,
    directory?: string,
    apiInternalDomain?: string,
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
        apiInternalDomain
    }: SupabaseStorageProviderOptions) {
        
        // Connect to the supbase via the internal domain
        // if it exists
        const internalApiUrl = new URL(apiUrl);
        const publicHostname = internalApiUrl.hostname;
        if(apiInternalDomain) {
            internalApiUrl.hostname = apiInternalDomain;
        } 
        const supabase = createClient(internalApiUrl.href, apiKey);

        (async function setupBucket() {

            // Get Bucket details
            const { data: bucketInfo, error: getBucketError } = await supabase
                .storage
                .getBucket(bucket)

            if(getBucketError && getBucketError.message !== 'The resource was not found')
                throw getBucketError;

            // Create Bucket if it doesn't exist
            if(getBucketError?.message === 'The resource was not found') {
                const { error: createBucketError } = await supabase
                    .storage
                    .createBucket(
                        bucket, 
                        { public: true }
                    );
                if(createBucketError) throw createBucketError;
            }

            // Edit Bucket privacy if it doesn't match the provider configuration 
            if(bucketInfo && bucketInfo.public !== true) {
                const { error: updateBucketError } = await supabase
                    .storage
                    .updateBucket(
                        bucket, 
                        { public: true }
                    );
                if(updateBucketError) throw updateBucketError;
            }
        })();


        // Remove any leading and trailing slashes
        if(directory)
            directory = directory.replace(/(^\/)|(\/$)/g, "");

        async function upload(file: StrapiFile, customParams = {}) {

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
                        contentType: file.mime,
                        ...customParams,
                    }
                );
            if(error) throw error;
   
            const { data: { publicUrl } } = supabase
                .storage
                .from(bucket)
                .getPublicUrl(uploadPath);

            // Ensure the public URL comes from the initial hostname
            // passed into the provider
            const assetUrl = new URL(publicUrl);
            assetUrl.hostname = publicHostname;
            file.url = assetUrl.href;
        };
        
        return {
            upload,
            uploadStream: upload,
            delete: async (file: any) => {
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