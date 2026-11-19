/**
 * Thin client for the ROG Elite API.
 *
 * By default the API runs inside the browser (backed by localStorage), so the
 * app needs no local server and can be deployed as a static site on Vercel.
 * The public functions and payload shapes are identical to the Laravel API.
 *
 * Set VITE_API_URL to point at a hosted Laravel API instead; when it is set,
 * requests are sent over fetch to that origin.
 */

export type UserRole = "user" | "admin";

export type ProductCategory = "laptop" | "cpu" | "gpu";

export interface RewardsSummary {
    points: number;
    tier: string;
    tier_label: string;
    next_tier: string | null;
    next_tier_label: string | null;
    next_tier_points: number | null;
    points_to_next_tier: number;
    progress_percent: number;
}

export interface ApiUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    points: number;
    rewards: RewardsSummary;
    member_since: string | null;
}

export interface ApiProduct {
    id: number;
    name: string;
    category: ProductCategory;
    category_label: string;
    price: string;
    price_formatted: string;
    description: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface AuthResponse {
    message: string;
    data: ApiUser;
    token: string;
    token_type: "Bearer";
}

export interface CreateProductInput {
    name: string;
    category: ProductCategory;
    price: number;
    description?: string;
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

interface PaginatedResponse<T> {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

interface ErrorPayload {
    message?: string;
    errors?: Record<string, string[]>;
}

const TOKEN_KEY = "rog_api_token";
const DB_KEY = "rog_local_db_v1";

const configuredUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE_URL = (
    configuredUrl && configuredUrl.trim() ? configuredUrl.trim() : "/api"
).replace(/\/+$/, "");

const REMOTE_API = configuredUrl !== undefined && configuredUrl.trim().length > 0;

export class ApiError extends Error {
    readonly status: number;

    readonly errors: Record<string, string[]>;

    constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.errors = errors;
    }

    firstValidationError(): string | null {
        const field = Object.keys(this.errors)[0];
        return field ? this.errors[field][0] ?? null : null;
    }
}

/**
 * Turn any thrown value into a message that can be shown to the user.
 */
export function describeApiError(error: unknown): string {
    if (error instanceof ApiError) {
        return error.firstValidationError() ?? error.message;
    }

    return "Something went wrong. Please try again.";
}

export function getToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function setToken(token: string): void {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        // Storage can be unavailable (private mode); the API still works for this session.
    }
}

export function clearToken(): void {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // Ignore storage failures.
    }
}

/* -------------------------------------------------------------------------- */
/* Local API (default) — mirrors the Laravel endpoints and response shapes.   */
/* -------------------------------------------------------------------------- */

interface StoredUser {
    id: number;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    points: number;
    member_since: string;
}

interface StoredProduct {
    id: number;
    name: string;
    category: ProductCategory;
    price: number;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface LocalDb {
    users: StoredUser[];
    products: StoredProduct[];
    tokens: Record<string, number>;
    nextUserId: number;
    nextProductId: number;
}

const TIERS = [
    { name: "explorer", label: "EXPLORER", minimum: 0 },
    { name: "vanguard", label: "VANGUARD", minimum: 600 },
    { name: "elite", label: "ELITE", minimum: 1500 },
    { name: "legend", label: "LEGEND", minimum: 3000 },
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
    laptop: "Laptop",
    cpu: "CPU / Motherboard",
    gpu: "Graphics Card",
};

let memoryDb: LocalDb | null = null;

function seedDb(): LocalDb {
    const base = Date.parse("2026-11-15T00:00:00.000Z");

    return {
        users: [
            {
                id: 1,
                name: "Administrator Root",
                email: "admin@rog.test",
                password: "Password123!",
                role: "admin",
                points: 3200,
                member_since: new Date(base).toISOString(),
            },
            {
                id: 2,
                name: "Juan Dela Cruz",
                email: "gamer@rog.test",
                password: "Password123!",
                role: "user",
                points: 100,
                member_since: new Date(base).toISOString(),
            },
        ],
        products: [
            ["ROG Strix SCAR 18 (2026)", "laptop", 189995, "Intel Core i9 with NVIDIA RTX 5080 Laptop GPU."],
            ["ROG Maximus Z890 Hero", "cpu", 38500, "Premium ATX motherboard engineered for extreme overclocking performance."],
            ["ROG Strix GeForce RTX 5090 OC", "gpu", 134900, "Next-gen architecture equipped with axial-tech cooling sets."],
            ["ROG Zephyrus G14 (2026)", "laptop", 119995, "14-inch ultraportable gaming laptop with an OLED Nebula display."],
            ["AMD Ryzen 9 9950X3D", "cpu", 42995, "16-core gaming processor with 3D V-Cache technology."],
            ["ROG Strix GeForce RTX 5070 Ti", "gpu", 62995, "High refresh 1440p graphics card tuned for competition play."],
        ].map(([name, category, price, description], index) => ({
            id: index + 1,
            name: name as string,
            category: category as ProductCategory,
            price: price as number,
            description: description as string,
            created_at: new Date(base + index * 60_000).toISOString(),
            updated_at: new Date(base + index * 60_000).toISOString(),
        })),
        tokens: {},
        nextUserId: 3,
        nextProductId: 7,
    };
}

function loadDb(): LocalDb {
    try {
        const raw = localStorage.getItem(DB_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as LocalDb;
            if (Array.isArray(parsed.users) && Array.isArray(parsed.products) && parsed.tokens) {
                return parsed;
            }
        }
    } catch {
        // Fall through to the in-memory store below.
    }

    if (!memoryDb) memoryDb = seedDb();
    return memoryDb;
}

function saveDb(db: LocalDb): void {
    memoryDb = db;
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
        // The in-memory copy keeps the session working when storage is blocked.
    }
}

function rewardsSummary(points: number): RewardsSummary {
    const value = Math.max(0, points);
    let current = TIERS[0];
    let next: (typeof TIERS)[number] | null = null;

    for (let index = 0; index < TIERS.length; index += 1) {
        if (value >= TIERS[index].minimum) {
            current = TIERS[index];
            next = TIERS[index + 1] ?? null;
        }
    }

    const nextPoints = next?.minimum ?? null;
    const progress = nextPoints === null
        ? 100
        : Math.round(((value - current.minimum) / (nextPoints - current.minimum)) * 100);

    return {
        points: value,
        tier: current.name,
        tier_label: current.label,
        next_tier: next?.name ?? null,
        next_tier_label: next?.label ?? null,
        next_tier_points: nextPoints,
        points_to_next_tier: nextPoints === null ? 0 : Math.max(0, nextPoints - value),
        progress_percent: Math.min(100, Math.max(0, progress)),
    };
}

function userResource(user: StoredUser): ApiUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        rewards: rewardsSummary(user.points),
        member_since: user.member_since,
    };
}

function productResource(product: StoredProduct): ApiProduct {
    return {
        id: product.id,
        name: product.name,
        category: product.category,
        category_label: CATEGORY_LABELS[product.category],
        price: product.price.toFixed(2),
        price_formatted: `₱${product.price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`,
        description: product.description,
        created_at: product.created_at,
        updated_at: product.updated_at,
    };
}

function validation(errors: Record<string, string[]>): never {
    throw new ApiError("The given data was invalid.", 422, errors);
}

function authenticatedUser(db: LocalDb, token: string | null): StoredUser {
    const userId = token ? db.tokens[token] : undefined;
    const user = userId === undefined ? undefined : db.users.find((item) => item.id === userId);

    if (!user) throw new ApiError("Unauthenticated.", 401);
    return user;
}

function makeToken(db: LocalDb, userId: number): string {
    const token = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    db.tokens[token] = userId;
    return token;
}

function isCategory(value: unknown): value is ProductCategory {
    return value === "laptop" || value === "cpu" || value === "gpu";
}

function parseBody(init: RequestInit): Record<string, unknown> {
    if (typeof init.body !== "string" || init.body.length === 0) return {};
    try {
        const parsed: unknown = JSON.parse(init.body);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

async function localRequest<T>(path: string, init: RequestInit): Promise<T> {
    const [pathname, query = ""] = path.split("?");
    const params = new URLSearchParams(query);
    const method = (init.method ?? "GET").toUpperCase();
    const body = parseBody(init);
    const db = loadDb();
    const token = getToken();

    if (method === "POST" && pathname === "/register") {
        const errors: Record<string, string[]> = {};
        const name = text(body.name);
        const email = text(body.email).toLowerCase();
        const password = typeof body.password === "string" ? body.password : "";

        if (!name) errors.name = ["The display name field is required."];
        else if (name.length > 120) errors.name = ["The display name field must not be greater than 120 characters."];
        if (!email) errors.email = ["The email field is required."];
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ["The email field must be a valid email."];
        else if (db.users.some((item) => item.email.toLowerCase() === email)) errors.email = ["The email has already been taken."];
        if (password.length < 8) errors.password = ["The password field must be at least 8 characters."];
        else if (password.length > 25) errors.password = ["The password field must not be greater than 25 characters."];
        else if (body.password_confirmation !== password) errors.password_confirmation = ["The password field confirmation does not match."];
        if (Object.keys(errors).length > 0) validation(errors);

        const user: StoredUser = {
            id: db.nextUserId,
            name,
            email,
            password,
            role: "user",
            points: 100,
            member_since: new Date().toISOString(),
        };
        db.users.push(user);
        db.nextUserId += 1;
        const authToken = makeToken(db, user.id);
        saveDb(db);

        return {
            message: "Account created successfully.",
            data: userResource(user),
            token: authToken,
            token_type: "Bearer",
        } as T;
    }

    if (method === "POST" && pathname === "/login") {
        const email = text(body.email).toLowerCase();
        const password = typeof body.password === "string" ? body.password : "";
        const user = db.users.find((item) => item.email.toLowerCase() === email);

        if (!user || user.password !== password) {
            validation({ email: ["The provided credentials are incorrect."] });
        }

        const authToken = makeToken(db, user.id);
        saveDb(db);

        return {
            message: "Signed in successfully.",
            data: userResource(user),
            token: authToken,
            token_type: "Bearer",
        } as T;
    }

    if (method === "GET" && pathname === "/me") {
        return { data: userResource(authenticatedUser(db, token)) } as T;
    }

    if (method === "POST" && pathname === "/logout") {
        if (token && db.tokens[token] !== undefined) {
            delete db.tokens[token];
            saveDb(db);
        }

        return { message: "Signed out successfully." } as T;
    }

    if (method === "GET" && pathname === "/rewards") {
        const user = authenticatedUser(db, token);
        return { data: rewardsSummary(user.points) } as T;
    }

    if (method === "GET" && pathname === "/health") {
        return {
            status: "ok",
            service: "ROG API",
            time: new Date().toISOString(),
        } as T;
    }

    const productMatch = pathname.match(/^\/products\/(\d+)$/);
    const foundProduct = productMatch
        ? db.products.find((item) => item.id === Number(productMatch[1]))
        : undefined;

    if (productMatch && !foundProduct) throw new ApiError("No query results for model.", 404);

    if (method === "GET" && pathname === "/products") {
        const category = params.get("category");
        const search = params.get("search")?.trim().toLowerCase() ?? "";
        const perPageRaw = Number(params.get("per_page") ?? "15");
        const perPage = Number.isInteger(perPageRaw) && perPageRaw >= 1
            ? Math.min(perPageRaw, 50)
            : 15;

        const matching = db.products
            .filter((item) => !category || item.category === category)
            .filter((item) => !search || item.name.toLowerCase().includes(search))
            .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);

        return {
            data: matching.slice(0, perPage).map(productResource),
            links: { first: null, last: null, prev: null, next: null },
            meta: {
                current_page: 1,
                last_page: Math.max(1, Math.ceil(matching.length / perPage)),
                per_page: perPage,
                total: matching.length,
            },
        } as T;
    }

    if (method === "GET" && productMatch && foundProduct) {
        return { data: productResource(foundProduct) } as T;
    }

    if (method === "POST" && pathname === "/products") {
        const user = authenticatedUser(db, token);
        if (user.role !== "admin") throw new ApiError("This action is unauthorized.", 403);

        const errors: Record<string, string[]> = {};
        const name = text(body.name);
        const category = body.category;
        const price = Number(body.price);
        const description = body.description === undefined || body.description === null
            ? null
            : text(body.description);

        if (!name) errors.name = ["The name field is required."];
        else if (name.length > 120) errors.name = ["The name field must not be greater than 120 characters."];
        if (!isCategory(category)) errors.category = ["The selected category is invalid."];
        if (!Number.isFinite(price)) errors.price = ["The price field must be a number."];
        else if (price < 0) errors.price = ["The price field must be at least 0."];
        else if (price > 9999999999.99) errors.price = ["The price field must not be greater than 9999999999.99."];
        if (description && description.length > 2000) errors.description = ["The description field must not be greater than 2000 characters."];
        if (Object.keys(errors).length > 0) validation(errors);

        const now = new Date().toISOString();
        const product: StoredProduct = {
            id: db.nextProductId,
            name,
            category: category as ProductCategory,
            price,
            description: description || null,
            created_at: now,
            updated_at: now,
        };
        db.products.push(product);
        db.nextProductId += 1;
        saveDb(db);

        return { message: "Product created successfully.", data: productResource(product) } as T;
    }

    if ((method === "PUT" || method === "PATCH") && productMatch && foundProduct) {
        const user = authenticatedUser(db, token);
        if (user.role !== "admin") throw new ApiError("This action is unauthorized.", 403);

        if (body.name !== undefined) foundProduct.name = text(body.name);
        if (body.category !== undefined && isCategory(body.category)) foundProduct.category = body.category;
        if (body.price !== undefined) foundProduct.price = Number(body.price);
        if (body.description !== undefined) foundProduct.description = text(body.description) || null;
        foundProduct.updated_at = new Date().toISOString();
        saveDb(db);

        return { message: "Product updated successfully.", data: productResource(foundProduct) } as T;
    }

    if (method === "DELETE" && productMatch && foundProduct) {
        const user = authenticatedUser(db, token);
        if (user.role !== "admin") throw new ApiError("This action is unauthorized.", 403);

        db.products = db.products.filter((item) => item.id !== foundProduct.id);
        saveDb(db);

        return { message: "Product deleted successfully." } as T;
    }

    throw new ApiError(`Request failed with status 404.`, 404);
}

/* -------------------------------------------------------------------------- */
/* Remote API (optional) — used only when VITE_API_URL is configured.         */
/* -------------------------------------------------------------------------- */

async function remoteRequest<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    if (init.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    } catch {
        throw new ApiError("Unable to reach the ROG API. Please try again.", 0);
    }

    const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

    if (!response.ok) {
        throw new ApiError(
            payload?.message ?? `Request failed with status ${response.status}.`,
            response.status,
            payload?.errors ?? {},
        );
    }

    return payload as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return REMOTE_API ? remoteRequest<T>(path, init) : localRequest<T>(path, init);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const auth = await request<AuthResponse>("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

    setToken(auth.token);
    return auth;
}

/**
 * Create a member account. The user signs in afterwards on the login page.
 */
export function register(input: RegisterInput): Promise<AuthResponse> {
    return request<AuthResponse>("/register", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function logout(): Promise<void> {
    try {
        if (getToken()) {
            await request<{ message: string }>("/logout", { method: "POST" });
        }
    } catch {
        // A revoked or unreachable session should still clear the local token.
    } finally {
        clearToken();
    }
}

export async function me(): Promise<ApiUser> {
    const payload = await request<{ data: ApiUser }>("/me");
    return payload.data;
}

export async function listProducts(): Promise<ApiProduct[]> {
    const payload = await request<PaginatedResponse<ApiProduct>>("/products?per_page=50");
    return payload.data;
}

export async function createProduct(input: CreateProductInput): Promise<ApiProduct> {
    const payload = await request<{ message: string; data: ApiProduct }>("/products", {
        method: "POST",
        body: JSON.stringify(input),
    });

    return payload.data;
}

export async function fetchRewards(): Promise<RewardsSummary> {
    const payload = await request<{ data: RewardsSummary }>("/rewards");
    return payload.data;
}
