export interface MarketPlace {
    status: string,
    name: string,
    unit: string,
    period: string,
    description: string,
    values: {x:number, y:number}[]
}