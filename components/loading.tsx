import { cn } from "@/lib/utils";
import { Frames, MotionGrid } from "./animate-ui/components/motion-grid";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

interface LoadingProps {
    className?: string;
    timeout?: number; // timeout in milliseconds
    onTimeout?: () => void;
    showTimeoutAction?: boolean;
}

export function Loading({ 
    className, 
    timeout = 15000, // 15 seconds default
    onTimeout,
    showTimeoutAction = true 
}: LoadingProps) {
    const [showTimeout, setShowTimeout] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTimeout(true);
            onTimeout?.();
        }, timeout);
        
        return () => clearTimeout(timer);
    }, [timeout, onTimeout]);

    const handleRefresh = () => {
        window.location.reload();
    };

    const importingFrames = [
        [[2, 2]],
        [
            [1, 2],
            [2, 1],
            [2, 3],
            [3, 2],
        ],
        [
            [2, 2],
            [0, 2],
            [1, 1],
            [1, 3],
            [2, 0],
            [2, 4],
            [3, 1],
            [3, 3],
            [4, 2],
        ],
        [
            [0, 1],
            [0, 3],
            [1, 0],
            [1, 2],
            [1, 4],
            [2, 1],
            [2, 3],
            [3, 0],
            [3, 2],
            [3, 4],
            [4, 1],
            [4, 3],
        ],
        [
            [0, 0],
            [0, 2],
            [0, 4],
            [1, 1],
            [1, 3],
            [2, 0],
            [2, 2],
            [2, 4],
            [3, 1],
            [3, 3],
            [4, 0],
            [4, 2],
            [4, 4],
        ],
        [
            [0, 1],
            [0, 3],
            [1, 0],
            [1, 2],
            [1, 4],
            [2, 1],
            [2, 3],
            [3, 0],
            [3, 2],
            [3, 4],
            [4, 1],
            [4, 3],
        ],
        [
            [0, 0],
            [0, 2],
            [0, 4],
            [1, 1],
            [1, 3],
            [2, 0],
            [2, 4],
            [3, 1],
            [3, 3],
            [4, 0],
            [4, 2],
            [4, 4],
        ],
        [
            [0, 1],
            [1, 0],
            [3, 0],
            [4, 1],
            [0, 3],
            [1, 4],
            [3, 4],
            [4, 3],
        ],
        [
            [0, 0],
            [0, 4],
            [4, 0],
            [4, 4],
        ],
        [],
    ] as Frames;
    
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center min-h-[400px] gap-4",
                className
            )}
        >
            <MotionGrid gridSize={[5, 5]} frames={importingFrames} />
            
            {showTimeout && showTimeoutAction && (
                <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Taking longer than expected...
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleRefresh}
                        >
                            Refresh Page
                        </Button>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => window.location.href = '/recovery.html'}
                        >
                            Recovery Mode
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}