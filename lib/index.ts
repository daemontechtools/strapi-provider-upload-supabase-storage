import { createClient } from "@supabase/supabase-js";
import { Stream } from "stream";


export type SupabaseStorageProviderOptions = {
    apiUrl: string,
    apiKey: string,
    bucket?: SupabaseStorageBucketOptions,
    directory?: string,
    options?: Object
}

export type SupabaseStorageBucketOptions = {
    name?: string,
    public?: boolean
}

const defaultBucketOptions: SupabaseStorageBucketOptions = {
    name: "strapi-uploads",
    public: true
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
        bucket,
        directory = "",

    }: SupabaseStorageProviderOptions) {
        const supabase = createClient(apiUrl, apiKey);
        bucket = { ...defaultBucketOptions, ...bucket };

        (async function setupBucket() {

            // Get Bucket details
            const { data: bucketInfo, error: getBucketError } = await supabase
                .storage
                .getBucket(bucket!.name!)

            if(getBucketError && getBucketError.message !== 'The resource was not found')
                throw getBucketError;

            // Create Bucket if it doesn't exist
            if(getBucketError?.message === 'The resource was not found') {
                const { error: createBucketError } = await supabase
                    .storage
                    .createBucket(
                        bucket!.name!, 
                        { public: bucket!.public! }
                    );
                if(createBucketError) throw createBucketError;
            }

            // Edit Bucket privacy if it doesn't match the provider configuration 
            if(bucketInfo && bucketInfo.public !== bucket!.public) {
                const { error: updateBucketError } = await supabase
                    .storage
                    .updateBucket(
                        bucket!.name!, 
                        { public: bucket!.public! }
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
                .from(bucket!.name!)
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
                .from(bucket!.name!)
                .getPublicUrl(uploadPath);
            file.url = publicUrl;
        };
        
        return {
            upload,
            uploadStream: upload,
            delete: async (file: any) => {
                const path = (file.path) ? file.path : '';
                const uploadPath = `${directory}/${path}${file.hash}${file.ext}`;
                const { error } = await supabase
                    .storage
                    .from(bucket!.name!)
                    .remove([uploadPath]);
                if(error) throw error;
            }
        };
    },
};