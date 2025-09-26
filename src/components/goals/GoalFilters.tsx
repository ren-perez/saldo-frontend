// /components/goals/GoalFilters.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Filter,
    ChevronDown,
    X,
    Search,
    Calendar,
    CreditCard,
    Target
} from 'lucide-react';

interface FilterOptions {
    accounts: Array<{
        id: number;
        name: string;
        account_type: string;
    }>;
    monthly_plans: Array<{
        id: number;
        name: string;
        month: number;
        year: number;
    }>;
}

interface Filters {
    account_id: string;
    monthly_plan_id: string;
    status?: string;
    search?: string;
}

interface GoalFiltersProps {
    filters: Filters;
    onFiltersChange: (filters: Filters) => void;
    filterOptions?: FilterOptions;
}

export function GoalFilters({ filters, onFiltersChange, filterOptions }: GoalFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleFilterChange = (key: keyof Filters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        onFiltersChange(newFilters);
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        // Debounce search - you might want to add a proper debounce hook
        setTimeout(() => {
            handleFilterChange('search', value);
        }, 300);
    };

    const clearFilters = () => {
        setSearchTerm('');
        onFiltersChange({
            account_id: '',
            monthly_plan_id: '',
            status: '',
            search: ''
        });
    };

    const getActiveFiltersCount = () => {
        return Object.entries(filters).filter(([key, value]) => value && value !== '').length;
    };

    const getAccountTypeIcon = (accountType: string) => {
        switch (accountType) {
            case 'SAVINGS':
                return '💰';
            case 'CHECKING':
                return '🏦';
            case 'CREDIT_CARD':
                return '💳';
            default:
                return '📊';
        }
    };

    const formatMonthlyPlan = (plan: FilterOptions['monthly_plans'][0]) => {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${monthNames[plan.month - 1]} ${plan.year}`;
    };

    return (
        <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search goals..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                            {getActiveFiltersCount() > 0 && (
                                <Badge variant="secondary" className="ml-1">
                                    {getActiveFiltersCount()}
                                </Badge>
                            )}
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Account Filter */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            Account
                                        </Label>
                                        <Select
                                            value={filters.account_id}
                                            onValueChange={(value) => handleFilterChange('account_id', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All accounts" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__all__">All accounts</SelectItem>
                                                {filterOptions?.accounts?.length > 0 ? (
                                                    filterOptions.accounts.map((account) => (
                                                        <SelectItem key={account.id} value={account.id.toString()}>
                                                            <div className="flex items-center gap-2">
                                                                <span>{getAccountTypeIcon(account.account_type)}</span>
                                                                <span>{account.name}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {account.account_type.toLowerCase()}
                                                                </Badge>
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem disabled value="no_accounts">No accounts found</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Monthly Plan Filter */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Monthly Plan
                                        </Label>
                                        <Select
                                            value={filters.monthly_plan_id}
                                            onValueChange={(value) => handleFilterChange('monthly_plan_id', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All periods" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__all__">All periods</SelectItem>
                                                {filterOptions?.monthly_plans?.length > 0 ? (
                                                    filterOptions.monthly_plans.map((plan) => (
                                                        <SelectItem key={plan.id} value={plan.id.toString()}>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-3 w-3" />
                                                                {formatMonthlyPlan(plan)}
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem disabled value="no_plans">No monthly plans</SelectItem>
                                                )}

                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Status Filter */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Target className="h-4 w-4" />
                                            Status
                                        </Label>
                                        <Select
                                            value={filters.status || ''}
                                            onValueChange={(value) => handleFilterChange('status', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__all__">All statuses</SelectItem>
                                                <SelectItem value="active">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                        Active
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="completed">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                        Completed
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="overdue">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                                        Overdue
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="on_hold">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                                        On Hold
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {getActiveFiltersCount() > 0 && (
                                    <div className="flex justify-end mt-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="flex items-center gap-2"
                                        >
                                            <X className="h-4 w-4" />
                                            Clear all filters
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </CollapsibleContent>
                </Collapsible>
            </div>

            {/* Active Filters Display */}
            {getActiveFiltersCount() > 0 && (
                <div className="flex flex-wrap gap-2">
                    {filters.search && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            Search: {filters.search}
                            <X
                                className="h-3 w-3 cursor-pointer hover:bg-destructive/10 rounded"
                                onClick={() => handleFilterChange('search', '')}
                            />
                        </Badge>
                    )}

                    {filters.account_id && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Account: {filterOptions?.accounts?.find(a => a.id.toString() === filters.account_id)?.name}
                            <X
                                className="h-3 w-3 cursor-pointer hover:bg-destructive/10 rounded"
                                onClick={() => handleFilterChange('account_id', '')}
                            />
                        </Badge>
                    )}

                    {filters.monthly_plan_id && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Plan: {formatMonthlyPlan(filterOptions?.monthly_plans?.find(p => p.id.toString() === filters.monthly_plan_id)!)}
                            <X
                                className="h-3 w-3 cursor-pointer hover:bg-destructive/10 rounded"
                                onClick={() => handleFilterChange('monthly_plan_id', '')}
                            />
                        </Badge>
                    )}

                    {filters.status && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Status: {filters.status}
                            <X
                                className="h-3 w-3 cursor-pointer hover:bg-destructive/10 rounded"
                                onClick={() => handleFilterChange('status', '')}
                            />
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}