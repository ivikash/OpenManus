import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { BrowserUseService } from './browser-use-service';

export class SocketService {
  private io: SocketIOServer | null = null;
  private browserUseService: BrowserUseService;

  constructor() {
    this.browserUseService = new BrowserUseService();
    
    // Set up event listeners for browser-use service
    this.browserUseService.on('log', (message) => {
      this.io?.emit('automation:log', message);
    });
    
    this.browserUseService.on('complete', () => {
      this.io?.emit('automation:complete');
    });
  }

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('prompt:submit', async (prompt: string) => {
        try {
          await this.browserUseService.runAutomation(prompt);
        } catch (error) {
          socket.emit('automation:error', {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
}