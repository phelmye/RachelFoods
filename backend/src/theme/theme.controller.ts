import { Controller, Get, Patch, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThemeService } from './theme.service';
import { ThemeConfig, UpdateThemeDto } from './theme.types';
import { AuthGuard } from '../common/guards/auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Theme')
@Controller('api/theme')
export class ThemeController {
    private readonly logger = new Logger(ThemeController.name);

    constructor(private readonly themeService: ThemeService) { }

    /**
     * GET /api/theme
     * Get active theme configuration
     * PUBLIC endpoint - no authentication required
     */
    @Get()
    @ApiOperation({ summary: 'Get active theme configuration (public)' })
    @ApiResponse({ status: 200, description: 'Active theme retrieved successfully' })
    async getActiveTheme(): Promise<ThemeConfig> {
        return this.themeService.getActiveTheme();
    }

    /**
     * PATCH /api/theme
     * Update active theme configuration
     * PLATFORM_ADMIN only
     */
    @Patch()
    @UseGuards(AuthGuard, RoleGuard)
    @Roles('PLATFORM_ADMIN')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update active theme (admin only)' })
    @ApiResponse({ status: 200, description: 'Theme updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
    async updateActiveTheme(@Body() updateDto: UpdateThemeDto): Promise<ThemeConfig> {
        return this.themeService.updateActiveTheme(updateDto);
    }

    /**
     * PATCH /api/theme/public-update
     * TEMPORARY: Update theme without auth (for testing only - REMOVE IN PRODUCTION)
     */
    @Patch('public-update')
    @ApiOperation({ summary: 'Update theme (temporary public endpoint)' })
    async publicUpdateTheme(@Body() updateDto: UpdateThemeDto): Promise<ThemeConfig> {
        return this.themeService.updateActiveTheme(updateDto);
    }
}
