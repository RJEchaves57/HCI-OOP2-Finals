<?php

namespace App\Enums;

enum ProductCategory: string
{
    case Laptop = 'laptop';
    case Cpu = 'cpu';
    case Gpu = 'gpu';

    /**
     * Human readable label used by the catalogue and API clients.
     */
    public function label(): string
    {
        return match ($this) {
            self::Laptop => 'Laptop',
            self::Cpu => 'CPU / Motherboard',
            self::Gpu => 'Graphics Card',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
