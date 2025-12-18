import { useState } from 'react';
import { AmazonTaskItem, AmazonTaskType, AMAZON_TASK_LABELS, AMAZON_POINTS } from '../lib/database.types';

interface AmazonTaskSelectorProps {
    isAmazon: boolean;
    amazonTasks: AmazonTaskItem[];
    onAmazonChange: (isAmazon: boolean) => void;
    onTasksChange: (tasks: AmazonTaskItem[]) => void;
}

const TASK_TYPES: AmazonTaskType[] = [
    'listing',
    'premium_a_plus',
    'basic_a_plus',
    'store_front',
    'brand_story',
    'color_variation',
    'mini_task',
];

export default function AmazonTaskSelector({
    isAmazon,
    amazonTasks,
    onAmazonChange,
    onTasksChange,
}: AmazonTaskSelectorProps) {
    const [selectedType, setSelectedType] = useState<AmazonTaskType>('listing');
    const [quantity, setQuantity] = useState(1);

    const addTask = () => {
        const newTask: AmazonTaskItem = { type: selectedType, quantity };
        onTasksChange([...amazonTasks, newTask]);
        setQuantity(1);
    };

    const removeTask = (index: number) => {
        const updated = amazonTasks.filter((_, i) => i !== index);
        onTasksChange(updated);
    };

    const updateQuantity = (index: number, newQty: number) => {
        const updated = amazonTasks.map((task, i) =>
            i === index ? { ...task, quantity: Math.max(1, newQty) } : task
        );
        onTasksChange(updated);
    };

    const calculatePoints = () => {
        return amazonTasks.reduce((total, task) => {
            return total + (AMAZON_POINTS[task.type] * task.quantity);
        }, 0);
    };

    return (
        <div className="space-y-4">
            {/* Amazon Toggle */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                        type="checkbox"
                        checked={isAmazon}
                        onChange={(e) => {
                            onAmazonChange(e.target.checked);
                            if (!e.target.checked) {
                                onTasksChange([]);
                            }
                        }}
                        className="w-5 h-5 rounded-lg border-2 border-orange-300 text-orange-500 focus:ring-orange-400"
                    />
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.395c-.275-.25-.1-.467.045-.634" />
                            <path d="M6.394 14.736c.26-.04.39.01.596.16.206.16.39.36.47.584.04.12.08.2.13.24.05.04.13.054.24.04l.2-.04c.26-.05.54-.1.76-.1.38 0 .78.13 1.14.36.36.24.58.58.58.98 0 .39-.16.75-.5 1.08-.34.32-.79.64-1.35.94-.56.3-1.1.46-1.62.46-.58 0-1.07-.14-1.5-.43-.43-.28-.64-.64-.64-1.06 0-.39.08-.73.24-1.04.16-.3.37-.56.62-.79.25-.22.59-.5 1.03-.82.17-.12.29-.2.36-.24zm7.27-2.29c-.3-.44-.64-.86-1.02-1.24-.39-.39-.81-.76-1.27-1.11-.46-.35-.9-.64-1.33-.88-.43-.24-.93-.42-1.5-.54l-.37-.08v-.56c0-.46.1-.86.31-1.2.21-.34.51-.62.9-.83.39-.21.83-.32 1.32-.32.48 0 .91.1 1.27.3.36.2.64.48.83.84.19.35.29.76.29 1.21v.43h2.05v-.57c0-.73-.15-1.38-.45-1.95-.3-.57-.73-1.02-1.28-1.35-.56-.32-1.2-.49-1.93-.49-.8 0-1.5.17-2.11.52-.61.35-1.09.83-1.43 1.44-.34.61-.51 1.3-.51 2.07v.79l-.55.08c-.65.12-1.22.32-1.71.62-.49.3-.87.66-1.14 1.1-.27.44-.4.96-.4 1.55 0 .64.14 1.19.43 1.66.29.47.7.83 1.24 1.1.54.26 1.17.39 1.89.39.6 0 1.13-.09 1.6-.27.47-.18.86-.43 1.18-.75.32-.32.56-.69.73-1.12.16-.43.25-.89.25-1.38v-.06c.11.07.23.14.36.22.43.26.83.56 1.21.91.38.35.71.73.98 1.13.28.4.48.83.61 1.27.13.44.2.9.2 1.36 0 .54-.09 1.06-.28 1.54-.19.49-.47.92-.84 1.3-.37.38-.83.68-1.37.9-.54.22-1.14.33-1.81.33-.64 0-1.23-.1-1.77-.3-.54-.2-1.02-.49-1.43-.87" />
                        </svg>
                        <span className="font-semibold text-gray-800">Amazon Task</span>
                    </div>
                </label>
                {isAmazon && amazonTasks.length > 0 && (
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Total Points</p>
                        <p className="text-lg font-bold text-orange-600">{calculatePoints().toFixed(2)}</p>
                    </div>
                )}
            </div>

            {/* Task Type Selector */}
            {isAmazon && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border">
                    <p className="text-sm font-medium text-gray-600">Add Amazon Tasks</p>

                    <div className="flex flex-wrap gap-2">
                        {TASK_TYPES.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setSelectedType(type)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedType === type
                                        ? 'bg-orange-500 text-white shadow'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                                    }`}
                            >
                                {AMAZON_TASK_LABELS[type]}
                                <span className="ml-1 text-xs opacity-70">({AMAZON_POINTS[type]}pt)</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500">Quantity:</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addTask}
                            className="px-4 py-1.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add
                        </button>
                    </div>

                    {/* Added Tasks List */}
                    {amazonTasks.length > 0 && (
                        <div className="space-y-2 mt-4">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Added Tasks</p>
                            {amazonTasks.map((task, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                            {AMAZON_TASK_LABELS[task.type]}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(index, task.quantity - 1)}
                                                className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-medium">{task.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(index, task.quantity + 1)}
                                                className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-600">
                                            {(AMAZON_POINTS[task.type] * task.quantity).toFixed(2)} pts
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeTask(index)}
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
