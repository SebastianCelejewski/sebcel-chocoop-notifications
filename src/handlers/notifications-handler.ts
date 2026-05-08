export const handler = async (event: any): Promise<void> => {

    console.log("Received event");

    console.log(
        JSON.stringify(event, null, 2)
    );
};