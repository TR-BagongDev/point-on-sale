"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Menu {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    categoryId: string;
    isAvailable: boolean;
    category: {
        id: string;
        name: string;
        color: string | null;
        icon: string | null;
    };
}

interface Category {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
}

interface MenuGridProps {
    menus: Menu[];
    categories: Category[];
    selectedCategory: string | null;
    searchQuery: string;
    onCategoryChange: (categoryId: string) => void;
    onSearchChange: (query: string) => void;
    onAddToCart: (menu: Menu) => void;
}

export function MenuGrid({
    menus,
    categories,
    selectedCategory,
    searchQuery,
    onCategoryChange,
    onSearchChange,
    onAddToCart,
}: MenuGridProps) {
    const filteredMenus = menus.filter((menu) => {
        const matchesCategory = !selectedCategory || menu.categoryId === selectedCategory;
        const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch && menu.isAvailable;
    });

    return (
        <div className="flex-1 flex flex-col">
            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Cari menu..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {categories.map((category) => (
                    <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        onClick={() => onCategoryChange(category.id)}
                        className={cn(
                            "shrink-0",
                            selectedCategory === category.id && "bg-primary-600 hover:bg-primary-700"
                        )}
                    >
                        {category.name}
                    </Button>
                ))}
            </div>

            {/* Menu Grid */}
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMenus.map((menu) => (
                        <Card
                            key={menu.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden group min-h-[44px]"
                            onClick={() => onAddToCart(menu)}
                        >
                            <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center min-h-[120px]">
                                {menu.image ? (
                                    <img src={menu.image} alt={menu.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-5xl">🍜</span>
                                )}
                            </div>
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-base truncate leading-tight">{menu.name}</h3>
                                <p className="text-primary-600 font-bold text-lg mt-2">
                                    {formatCurrency(menu.price)}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
