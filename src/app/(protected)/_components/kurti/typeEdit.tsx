import { categoryTypeUpdate } from '@/src/actions/category';
import { Button } from '@/src/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog'
import { Input } from '@/src/components/ui/input';
import React, { useState } from 'react'
import { toast } from 'sonner';

interface TypeEditProps {
    categoryName: string;
    onUpdateType: (categoryName: string, newType: string) => void;
}

const TypeEdit: React.FC<TypeEditProps> = ({ categoryName, onUpdateType }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newType, setNewType] = useState("");
    const [loading, setLoading] = useState(false);
    const handleTypeUpdate = async () => {
        setLoading(true);
        try {
            let lowercaseName = categoryName.toLowerCase();
            let updatedType = newType.toUpperCase();
            const data = await categoryTypeUpdate(lowercaseName, updatedType);
            if (data.success) {
                await onUpdateType(lowercaseName, updatedType);
                toast.success(data.success);
            }
        } catch (e: any) {
            toast.error("Something went wrong, please try again later.");
        }
        finally {
            setLoading(false);
        }
    }
    return (
        <>
            {!categoryName ? "" :
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button type='button' className="ml-1 p-1" variant={'outline'} key={'edit'}>
                            ✏️
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Update type of category -  {categoryName}</DialogTitle>
                        </DialogHeader>
                        <h2 className='pt-2'>Enter the new type</h2>
                        <Input
                            value={newType}
                            onChange={(e) => { setNewType(e.target.value) }}
                        >
                        </Input>
                        <Button
                            type="button"
                            onClick={handleTypeUpdate}
                            disabled={loading}
                        >
                            Save
                        </Button>
                    </DialogContent>
                </Dialog>
            }
        </>
    )
}

export default TypeEdit