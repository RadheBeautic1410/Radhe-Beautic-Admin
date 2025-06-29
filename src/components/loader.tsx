// PageLoader.tsx

import React from "react";
import { HashLoader } from "react-spinners";

const PageLoader: React.FC<{ loading: boolean }> = ({ loading }) => {
    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: loading ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.167)", // Optional: Add a semi-transparent background
            }}
            className="bg-opacity-10"
        >
            <HashLoader color="black" loading={loading} size={50} />
        </div>
    );
};

export default PageLoader;
