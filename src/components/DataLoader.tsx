// PageLoader.tsx

import React from "react";
import { HashLoader, ScaleLoader } from "react-spinners";

const DataLoader: React.FC<{ loading: boolean }> = ({ loading }) => {
    return (
        <div className="w-full h-96 flex justify-center items-center">
            <ScaleLoader
                color="#36D7B7"
                loading={loading} height={50}
                margin={3}
                radius={4}
                width={5}
            />
        </div>
    );
};

export default DataLoader;
