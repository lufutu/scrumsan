import { cn } from "@/lib/utils";
import { Frames, MotionGrid } from "./animate-ui/components/motion-grid";

interface LoadingProps {
    className?: string;
}

export function Loading({ className }: LoadingProps) {
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
                "flex items-center justify-center min-h-[400px]",
                className
            )}
        >
            <MotionGrid gridSize={[5, 5]} frames={importingFrames} />
        </div>
    );
}