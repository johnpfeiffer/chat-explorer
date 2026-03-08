export namespace models {
	
	export class ConversationEntry {
	    conversationId: string;
	    conversationName: string;
	    conversationCreatedAt: string;
	    speaker: string;
	    message: string;
	    messageTimestamp: string;
	
	    static createFrom(source: any = {}) {
	        return new ConversationEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.conversationId = source["conversationId"];
	        this.conversationName = source["conversationName"];
	        this.conversationCreatedAt = source["conversationCreatedAt"];
	        this.speaker = source["speaker"];
	        this.message = source["message"];
	        this.messageTimestamp = source["messageTimestamp"];
	    }
	}

}

