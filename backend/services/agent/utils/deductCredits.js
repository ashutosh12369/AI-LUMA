import axios from "axios";

export const deductCredits = async (

    userId,

    agent

) => {

    try {

        await axios.patch(

            `https://ailuma-auth-service.onrender.com/internal/deduct-credits`,

            {

                userId,

                agent

            }

        );

    }

    catch (error) {

        const response =
            error.response?.data;

        if (error.response?.status === 400 || error.response?.status === 403) {
            const err = new Error(response?.message || "Failed to deduct credits.");
            err.status = error.response?.status;
            err.data = {
                success: false,
                title: response?.title || "Insufficient Credits",
                message: response?.message || "You don't have enough credits. Please upgrade your plan."
            };
            throw err;
        } else {
            const err = new Error(error.message);
            err.status = 500;
            err.data = {
                success: false,
                title: "Server Waking Up",
                message: "The authentication server is waking up from sleep mode. Please try again in 30 seconds."
            };
            throw err;
        }

    }

};