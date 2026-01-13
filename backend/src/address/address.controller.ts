import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Controller('api/addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
    constructor(private addressService: AddressService) { }

    /**
     * POST /api/addresses
     * Create a new address
     */
    @Post()
    async createAddress(@Request() req, @Body() dto: CreateAddressDto) {
        const userId = req.user.sub;
        return this.addressService.createAddress(userId, dto);
    }

    /**
     * GET /api/addresses
     * Get all user addresses
     */
    @Get()
    async getUserAddresses(@Request() req) {
        const userId = req.user.sub;
        return this.addressService.getUserAddresses(userId);
    }

    /**
     * GET /api/addresses/:id
     * Get a single address
     */
    @Get(':id')
    async getAddress(@Request() req, @Param('id') addressId: string) {
        const userId = req.user.sub;
        return this.addressService.getAddress(userId, addressId);
    }

    /**
     * PUT /api/addresses/:id
     * Update an address
     */
    @Put(':id')
    async updateAddress(
        @Request() req,
        @Param('id') addressId: string,
        @Body() dto: UpdateAddressDto,
    ) {
        const userId = req.user.sub;
        return this.addressService.updateAddress(userId, addressId, dto);
    }

    /**
     * DELETE /api/addresses/:id
     * Delete an address
     */
    @Delete(':id')
    async deleteAddress(@Request() req, @Param('id') addressId: string) {
        const userId = req.user.sub;
        await this.addressService.deleteAddress(userId, addressId);
        return { success: true, message: 'Address deleted successfully' };
    }

    /**
     * POST /api/addresses/:id/set-default
     * Set address as default
     */
    @Post(':id/set-default')
    async setDefaultAddress(@Request() req, @Param('id') addressId: string) {
        const userId = req.user.sub;
        return this.addressService.setDefaultAddress(userId, addressId);
    }
}
