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
import { RefillService } from './refill.service';
import {
    CreateRefillProfileDto,
    UpdateRefillProfileDto,
    CreateRefillOrderDto,
} from './dto/refill.dto';

@Controller('api/refill')
@UseGuards(JwtAuthGuard)
export class RefillController {
    constructor(private refillService: RefillService) { }

    /**
     * POST /api/refill/create
     * Create or update a refill profile
     */
    @Post('create')
    async createRefillProfile(
        @Request() req,
        @Body() dto: CreateRefillProfileDto,
    ) {
        const userId = req.user.sub;
        return this.refillService.createOrUpdateRefillProfile(userId, dto);
    }

    /**
     * GET /api/refill
     * Get user's refill profiles
     */
    @Get()
    async getUserRefills(@Request() req) {
        const userId = req.user.sub;
        return this.refillService.getUserRefillProfiles(userId);
    }

    /**
     * POST /api/refill/order
     * Create order from refill profile
     */
    @Post('order')
    async createRefillOrder(@Request() req, @Body() dto: CreateRefillOrderDto) {
        const userId = req.user.sub;
        return this.refillService.createOrderFromRefill(userId, dto);
    }

    /**
     * PUT /api/refill/:id
     * Update refill profile
     */
    @Put(':id')
    async updateRefillProfile(
        @Request() req,
        @Param('id') profileId: string,
        @Body() dto: UpdateRefillProfileDto,
    ) {
        const userId = req.user.sub;
        return this.refillService.updateRefillProfile(userId, profileId, dto);
    }

    /**
     * DELETE /api/refill/:id
     * Deactivate refill profile
     */
    @Delete(':id')
    async deleteRefillProfile(@Request() req, @Param('id') profileId: string) {
        const userId = req.user.sub;
        await this.refillService.deleteRefillProfile(userId, profileId);
        return { success: true, message: 'Refill profile deactivated' };
    }

    /**
     * GET /api/refill/analytics
     * Admin only: Get refill analytics
     */
    @Get('analytics')
    async getRefillAnalytics(@Request() req) {
        // TODO: Add admin role check
        return this.refillService.getRefillAnalytics();
    }
}
